package ai.skyforest.wayback;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
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
 * Три правила, и все выстраданы.
 *
 * Первое: ни один вызов не остаётся без ответа. Capacitor вызывает метод
 * плагина внутри try/catch, который на исключении только пишет в лог («Serious
 * error executing plugin», Bridge.callPluginMethod) и НЕ отклоняет вызов —
 * промис в JS висит навсегда, а экран показывает вечное «настраиваем запись».
 * Поэтому обёрнуто тело каждого метода И каждого колбэка разрешений: колбэк
 * система зовёт позже и уже вне того try/catch.
 *
 * Второе: start() не ждёт. Раньше он держал вызов, пока служба не поднимет
 * флаг, — и любая заминка внутри службы превращалась в отсутствие ответа.
 * Теперь он отвечает по факту вызова startForegroundService: успех значит
 * «команда принята системой», не более. Поднялась ли служба на самом деле,
 * спрашивают отдельно у status() — тот отвечает мгновенно, потому что читает
 * флаг, а не ждёт события. Так «нет ответа» перестаёт быть возможным исходом.
 *
 * Третье: причина отказа доезжает до JS. Служба, упавшая на startForeground,
 * оставляет текст в TrackService.lastFailure(), и status() отдаёт его полем
 * failure — иначе человеку остаётся «не получилось», а нам гадание.
 *
 * Системные диалоги внутри start() тоже под запретом сверх необходимого:
 * разрешение на уведомления спрашивается отдельным вызовом уже после старта,
 * иначе ответ на промис ждал бы, пока человек читает диалог.
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
        try {
            if (getPermissionState(LOCATION) != PermissionState.GRANTED) {
                requestPermissionForAliases(new String[] { LOCATION, PRECISE }, call, "afterLocation");
                return;
            }
            launch(call);
        } catch (Exception e) {
            failed(call, e);
        }
    }

    @PermissionCallback
    private void afterLocation(PluginCall call) {
        try {
            launch(call);
        } catch (Exception e) {
            failed(call, e);
        }
    }

    /**
     * Разрешение на уведомления. Отдельным вызовом и после старта: служба
     * работает и без него, а вот ответ на start() ждал бы человека у диалога.
     * Без уведомления запись невидима — об этом приложение говорит вслух, но
     * останавливать из-за этого поход неправильно.
     */
    @PluginMethod
    public void requestNotifications(PluginCall call) {
        try {
            if (needsNotificationPrompt()) {
                requestPermissionForAlias(NOTIFICATION, call, "afterNotifications");
                return;
            }
            call.resolve(status());
        } catch (Exception e) {
            failed(call, e);
        }
    }

    @PermissionCallback
    private void afterNotifications(PluginCall call) {
        try {
            call.resolve(status());
        } catch (Exception e) {
            failed(call, e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), TrackService.class));
            call.resolve(status());
        } catch (Exception e) {
            failed(call, e);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        try {
            call.resolve(status());
        } catch (Exception e) {
            failed(call, e);
        }
    }

    /** Настройки приложения: единственный путь вернуть однажды отклонённое разрешение. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            failed(call, e);
        }
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
        Float distance = call.getFloat("distanceFilter", 10f);
        intent.putExtra(TrackService.EXTRA_DISTANCE, distance == null ? 10f : distance.floatValue());
        try {
            ContextCompat.startForegroundService(getContext(), intent);
        } catch (Exception e) {
            // ForegroundServiceStartNotAllowedException и родня: система не даёт
            // поднять службу из фона. Отдаём наружу как отказ, а не как успех.
            call.reject("Could not start the recording service: " + e.getClass().getSimpleName(), "SERVICE_BLOCKED", e, status());
            return;
        }
        // Ответ сразу. Служба к этому моменту, скорее всего, ещё не встала —
        // и это нормально: поднялась она или нет, JS узнаёт у status(), а не из
        // ожидания здесь. Ожидание было единственным местом, где вызов мог
        // остаться без ответа, и его больше нет.
        call.resolve(status());
    }

    /** Исключение наружу выпускать нельзя, поэтому превращаем его в отказ с текстом. */
    private void failed(PluginCall call, Exception e) {
        call.reject(e.getClass().getSimpleName() + ": " + e.getMessage(), "PLUGIN_ERROR", e);
    }

    private JSObject status() {
        JSObject data = new JSObject();
        data.put("running", TrackService.isRunning());
        data.put("precise", getPermissionState(PRECISE) == PermissionState.GRANTED);
        data.put("location", getPermissionState(LOCATION) == PermissionState.GRANTED);
        data.put("notifications", notificationsAllowed());
        // Последний отказ самой службы. Она падает уже после того, как метод
        // плагина вернулся, поэтому иначе о причине не узнать никак.
        data.put("failure", TrackService.lastFailure());
        return data;
    }

    private boolean notificationsAllowed() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return getPermissionState(NOTIFICATION) == PermissionState.GRANTED;
    }

    private boolean needsNotificationPrompt() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState(NOTIFICATION) == PermissionState.PROMPT;
    }
}
