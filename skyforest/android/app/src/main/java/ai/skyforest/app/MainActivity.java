package ai.skyforest.app;

import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

// Требование @capgo/capacitor-social-login: без этого Google-логин со scopes
// падает с ошибкой "You CANNOT use scopes without modifying the main activity".
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    /** Первая проверка загрузки skyforest.ai после холодного старта. */
    private static final long REMOTE_LOAD_WATCHDOG_MS = 12_000;
    /** Интервал повторных проверок, пока сеть валидна, но страница не догрузилась. */
    private static final long REMOTE_LOAD_RETRY_MS = 8_000;
    /** Сколько раз дать медленной сети шанс, прежде чем увести на офлайн-экран. */
    private static final int REMOTE_LOAD_MAX_RETRIES = 2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null) {
            bridge.setWebViewClient(new OfflineShellWebViewClient(bridge));
        }
        redirectToOfflineScreenIfNeeded();
    }

    /**
     * Раздаёт файлы офлайн-оболочки (assets/public) по адресам https://localhost/*.
     *
     * Штатный WebViewLocalServer при заданном server.url обслуживает локально
     * только сам errorPath (точное совпадение URL) — все подресурсы офлайн-экрана
     * (leaflet.js, offline-track.js, CSS, тайлы basemap) он «проксирует» в сеть,
     * которой нет, и офлайн-страница остаётся пустой под вечным splash.
     * Пути /_capacitor_file_* оставляем штатному серверу (скачанные тайлы карты).
     */
    private static class OfflineShellWebViewClient extends BridgeWebViewClient {

        private final android.content.res.AssetManager assets;

        OfflineShellWebViewClient(Bridge bridge) {
            super(bridge);
            this.assets = bridge.getContext().getAssets();
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            String path = url.getPath();
            if (
                "localhost".equals(url.getHost()) &&
                path != null &&
                !path.startsWith("/_capacitor_file_") &&
                !path.startsWith("/_capacitor_content_")
            ) {
                WebResourceResponse local = serveShellAsset(path);
                if (local != null) return local;
            }
            return super.shouldInterceptRequest(view, request);
        }

        private WebResourceResponse serveShellAsset(String path) {
            String assetPath = "public" + ("/".equals(path) ? "/index.html" : path);
            try {
                InputStream stream = assets.open(assetPath);
                return new WebResourceResponse(mimeFor(assetPath), "utf-8", 200, "OK", new HashMap<>(), stream);
            } catch (IOException e) {
                return null;
            }
        }

        private static String mimeFor(String path) {
            if (path.endsWith(".html")) return "text/html";
            if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
            if (path.endsWith(".css")) return "text/css";
            if (path.endsWith(".png")) return "image/png";
            if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
            if (path.endsWith(".svg")) return "image/svg+xml";
            if (path.endsWith(".json")) return "application/json";
            if (path.endsWith(".woff2")) return "font/woff2";
            return "application/octet-stream";
        }
    }

    /**
     * Холодный старт без интернета: WebView может минутами «висеть» на загрузке
     * skyforest.ai (DNS/TCP-таймаут), errorPath при этом не срабатывает, а splash
     * с launchAutoHide=false никто не прячет — приложение выглядит зависшим.
     *
     *  - Нет валидированного интернета (авиарежим, Wi-Fi без выхода в сеть) —
     *    сразу открываем офлайн-экран Track (errorPath).
     *  - Сеть формально есть — сторожевой таймер: если через 12 с страница так и
     *    не догрузилась, тоже уводим на офлайн-экран (там есть кнопка
     *    «Открыть приложение» для повторной попытки).
     */
    private void redirectToOfflineScreenIfNeeded() {
        if (bridge == null) return;
        final String errorUrl = bridge.getErrorUrl();
        if (errorUrl == null) return;

        if (!hasValidatedInternet()) {
            Log.i("SkyForestOffline", "No validated network on cold start, loading offline screen");
            bridge.getWebView().loadUrl(errorUrl);
            return;
        }

        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(() -> checkRemoteLoaded(handler, errorUrl, 0), REMOTE_LOAD_WATCHDOG_MS);
    }

    private void checkRemoteLoaded(Handler handler, String errorUrl, int attempt) {
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView == null) return;
        String current = webView.getUrl();
        boolean onErrorPage = current != null && current.startsWith(errorUrl);
        boolean loaded = current != null && webView.getProgress() >= 100;
        if (onErrorPage || loaded) return;

        if (!hasValidatedInternet()) {
            // Сеть пропала, пока грузились, — дальше ждать нечего.
            Log.i("SkyForestOffline", "Network lost while loading, loading offline screen");
            webView.loadUrl(errorUrl);
        } else if (attempt < REMOTE_LOAD_MAX_RETRIES) {
            // Сеть валидна — даём медленному соединению ещё шанс.
            Log.i("SkyForestOffline", "Remote app still loading, retry " + (attempt + 1));
            handler.postDelayed(() -> checkRemoteLoaded(handler, errorUrl, attempt + 1), REMOTE_LOAD_RETRY_MS);
        } else {
            Log.i("SkyForestOffline", "Remote app not loaded in time, loading offline screen");
            webView.loadUrl(errorUrl);
        }
    }

    private boolean hasValidatedInternet() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return true; // не можем проверить — не мешаем обычной загрузке
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return (
            caps != null &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        );
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("SkyForestGoogleAuth", "SocialLogin plugin handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("SkyForestGoogleAuth", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    // Маркерный метод интерфейса, плагином не вызывается.
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
