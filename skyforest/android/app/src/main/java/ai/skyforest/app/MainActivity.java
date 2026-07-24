package ai.skyforest.app;

import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

// Требование @capgo/capacitor-social-login: без этого Google-логин со scopes
// падает с ошибкой "You CANNOT use scopes without modifying the main activity".
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    /** Сколько ждать загрузку skyforest.ai, прежде чем увести на офлайн-экран. */
    private static final long REMOTE_LOAD_WATCHDOG_MS = 12_000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        redirectToOfflineScreenIfNeeded();
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

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            WebView webView = bridge != null ? bridge.getWebView() : null;
            if (webView == null) return;
            String current = webView.getUrl();
            boolean onErrorPage = current != null && current.startsWith(errorUrl);
            boolean loaded = current != null && webView.getProgress() >= 100;
            if (!onErrorPage && !loaded) {
                Log.i("SkyForestOffline", "Remote app not loaded in time, loading offline screen");
                webView.loadUrl(errorUrl);
            }
        }, REMOTE_LOAD_WATCHDOG_MS);
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
