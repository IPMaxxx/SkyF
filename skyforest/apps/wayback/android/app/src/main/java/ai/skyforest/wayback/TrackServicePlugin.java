package ai.skyforest.wayback;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Мост в JS для TrackService.
 *
 * Главное отличие от плагина фоновой геолокации, из-за которого этот код и
 * появился: start() возвращает честный промис. Он отклоняется с кодом, если
 * службу поднять не удалось, и разрешается только после того, как служба
 * действительно встала. Раньше «фоновая запись включена» означало лишь то,
 * что вызов зарегистрировали, и поход писался вникуда.
 */
@CapacitorPlugin(
    name = "WayBackTrack",
    permissions = {
        // Fused-провайдер отдаёт координаты и по грубому разрешению, поэтому
        // обязательным считаем только его: отказ от «точного» ухудшает след,
        // но не отменяет запись.
        @Permission(strings = { Manifest.permission.ACCESS_COARSE_LOCATION }, alias = TrackServicePlugin.LOCATION),
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = TrackServicePlugin.PRECISE),
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = TrackServicePlugin.NOTIFICATION)
    }
)
public class TrackServicePlugin extends Plugin {

    static final String LOCATION = "location";
    static final String PRECISE = "precise";
    static final String NOTIFICATION = "notification";

    /** Сколько ждём подтверждения, что служба встала, прежде чем считать отказом. */
    private static final long START_TIMEOUT_MS = 4_000;
    private static final long START_POLL_MS = 100;

    @Override
    public void load() {
        super.load();
        attachListener();
    }

    /**
     * Служба живёт дольше WebView. Слушателя снимаем, чтобы не звать мост
     * уничтоженного окна, но запись не останавливаем: поход продолжается, а
     * при новом старте страницы плагин подпишется заново.
     */
    @Override
    protected void handleOnDestroy() {
        TrackService.setListener(null);
        super.handleOnDestroy();
    }

    private void attachListener() {
        TrackService.setListener((latitude, longitude, accuracy, time) -> {
            JSObject location = new JSObject();
            location.put("latitude", latitude);
            location.put("longitude", longitude);
            location.put("accuracy", accuracy == null ? null : accuracy.doubleValue());
            location.put("time", time);
            notifyListeners("location", location);
        });
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState(LOCATION) != PermissionState.GRANTED) {
            requestPermissionForAliases(permissionAliases(), call, "afterPermissions");
            return;
        }
        // Разрешение на уведомления спрашиваем до старта: без него служба
        // работает, но человек не видит, что идёт запись, а нам нужно как раз
        // обратное.
        if (needsNotificationPrompt()) {
            requestPermissionForAlias(NOTIFICATION, call, "afterPermissions");
            return;
        }
        launch(call);
    }

    @PermissionCallback
    private void afterPermissions(PluginCall call) {
        launch(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), TrackService.class));
        call.resolve(status());
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(status());
    }

    /** Настройки приложения: единственный путь вернуть однажды отклонённое разрешение. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private void launch(PluginCall call) {
        if (getPermissionState(LOCATION) != PermissionState.GRANTED) {
            call.reject("Location permission is not granted", "NOT_AUTHORIZED", status());
            return;
        }
        attachListener();

        Intent intent = new Intent(getContext(), TrackService.class);
        intent.setAction(TrackService.ACTION_START);
        intent.putExtra(TrackService.EXTRA_TITLE, call.getString("title", ""));
        intent.putExtra(TrackService.EXTRA_MESSAGE, call.getString("message", ""));
        intent.putExtra(TrackService.EXTRA_DISTANCE, call.getFloat("distanceFilter", 10f));
        try {
            ContextCompat.startForegroundService(getContext(), intent);
        } catch (Exception e) {
            // ForegroundServiceStartNotAllowedException и родня: система не даёт
            // поднять службу из фона. Отдаём наружу как отказ, а не как успех.
            call.reject("Could not start the recording service: " + e.getClass().getSimpleName(), "SERVICE_BLOCKED", e, status());
            return;
        }
        awaitRunning(call, 0);
    }

    /**
     * startForegroundService() возвращает управление до того, как служба
     * успевает подняться, поэтому ждём флаг самой службы. Так «включилась» и
     * «вызов зарегистрирован» перестают быть одним и тем же.
     */
    private void awaitRunning(PluginCall call, long waited) {
        if (TrackService.isRunning()) {
            call.resolve(status());
            return;
        }
        if (waited >= START_TIMEOUT_MS) {
            call.reject("The recording service did not start", "SERVICE_FAILED", status());
            return;
        }
        new Handler(Looper.getMainLooper()).postDelayed(() -> awaitRunning(call, waited + START_POLL_MS), START_POLL_MS);
    }

    private JSObject status() {
        JSObject data = new JSObject();
        data.put("running", TrackService.isRunning());
        data.put("precise", getPermissionState(PRECISE) == PermissionState.GRANTED);
        data.put("location", getPermissionState(LOCATION) == PermissionState.GRANTED);
        data.put("notifications", notificationsAllowed());
        return data;
    }

    private boolean notificationsAllowed() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return getPermissionState(NOTIFICATION) == PermissionState.GRANTED;
    }

    private boolean needsNotificationPrompt() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState(NOTIFICATION) == PermissionState.PROMPT;
    }

    /**
     * До Android 13 разрешения на уведомления не существует, и запрос вернулся
     * бы отказом — считать бы пришлось, что уведомление запрещено.
     */
    private String[] permissionAliases() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return new String[] { LOCATION, PRECISE, NOTIFICATION };
        }
        return new String[] { LOCATION, PRECISE };
    }
}
