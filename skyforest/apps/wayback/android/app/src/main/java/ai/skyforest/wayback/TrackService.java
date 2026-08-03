package ai.skyforest.wayback;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

/**
 * Служба переднего плана, которая пишет путь похода с погашенным экраном.
 *
 * Своя, а не из плагина фоновой геолокации, по трём причинам, каждая из
 * которых стоила нам дня отладки. Уведомление плагина система придерживала
 * десять секунд и прятала содержимое на экране блокировки — а уведомление
 * здесь не украшение, оно и есть механизм: без него Android забирает у
 * приложения геолокацию. Координаты плагин просил только у GPS_PROVIDER, то
 * есть в помещении не отдавал ни точки. И об отказе старта он сообщал не
 * отклонённым промисом, а колбэком, поэтому «служба не поднялась» выглядело
 * как «всё хорошо».
 *
 * Здесь: уведомление показывается сразу и целиком, координаты идут через
 * fused-провайдер (в помещении тоже), а поднялась служба или нет — видно по
 * isRunning().
 *
 * Сама себя служба не поднимает: BOOT_COMPLETED не слушаем, START_NOT_STICKY.
 * Живёт ровно от «начал поход» до «завершил поход».
 */
public class TrackService extends Service {

    /** Получатель координат — мост в JS. Живёт в плагине, здесь только ссылка. */
    public interface Listener {
        void onLocation(double latitude, double longitude, Float accuracy, long time);
    }

    static final String ACTION_START = "ai.skyforest.wayback.action.TRACK_START";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_MESSAGE = "message";
    static final String EXTRA_DISTANCE = "distance";

    private static final String TAG = "WayBackTrack";
    /** Новый канал, а не унаследованный: у существующего канала важность и
     *  видимость на экране блокировки задним числом не меняются. */
    private static final String CHANNEL_ID = "wayback_track";
    private static final int NOTIFICATION_ID = 8461;
    /** Как часто спрашиваем координату; реальный шаг задаёт фильтр сдвига. */
    private static final long INTERVAL_MS = 5_000;

    /**
     * Слушатель и флаг статические: служба переживает и перезагрузку страницы,
     * и пересоздание Activity, а плагин при этом создаётся заново.
     */
    private static volatile Listener listener;
    private static volatile boolean running;
    /**
     * Почему служба не поднялась. Logcat у человека в лесу не спросишь, поэтому
     * причина уезжает в JS и показывается на экране похода строкой, которую
     * можно скопировать и переслать.
     */
    private static volatile String lastFailure;

    private FusedLocationProviderClient client;
    private LocationCallback callback;
    private PowerManager.WakeLock wakeLock;

    public static void setListener(Listener next) {
        listener = next;
    }

    public static boolean isRunning() {
        return running;
    }

    public static String lastFailure() {
        return lastFailure;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        String message = intent != null ? intent.getStringExtra(EXTRA_MESSAGE) : null;
        float distance = intent != null ? intent.getFloatExtra(EXTRA_DISTANCE, 10f) : 10f;

        // Уведомление — первым делом: с момента startForegroundService у службы
        // пять секунд, иначе система убивает приложение.
        lastFailure = null;
        try {
            promoteToForeground(title, message);
        } catch (Exception e) {
            lastFailure = "startForeground: " + e.getClass().getSimpleName() + ": " + e.getMessage();
            Log.e(TAG, "Could not show the ongoing notification", e);
            stopSelf();
            return START_NOT_STICKY;
        }

        acquireWakeLock();
        requestUpdates(distance);
        running = true;
        // Повторный старт (перезагрузка страницы посреди похода) сюда же и
        // приходит: уведомление обновляется, подписка переставляется, второй
        // службы не появляется.
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (client != null && callback != null) {
            client.removeLocationUpdates(callback);
        }
        callback = null;
        releaseWakeLock();
        super.onDestroy();
    }

    private void requestUpdates(float distanceFilter) {
        if (client == null) {
            client = LocationServices.getFusedLocationProviderClient(this);
        }
        if (callback != null) {
            client.removeLocationUpdates(callback);
        }
        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                Listener current = listener;
                if (location == null || current == null) return;
                current.onLocation(
                    location.getLatitude(),
                    location.getLongitude(),
                    location.hasAccuracy() ? location.getAccuracy() : null,
                    location.getTime()
                );
            }
        };
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateDistanceMeters(distanceFilter)
            .setWaitForAccurateLocation(false)
            .build();
        try {
            client.requestLocationUpdates(request, callback, Looper.getMainLooper());
        } catch (SecurityException e) {
            // Разрешение проверяет плагин до старта; сюда попадаем, только если
            // его отозвали на ходу — тогда записи нет и держать службу незачем.
            Log.e(TAG, "Location permission revoked while recording", e);
            stopSelf();
        }
    }

    private void promoteToForeground(String title, String message) {
        Notification notification = buildNotification(title, message);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String title, String message) {
        String safeTitle = title != null && !title.isEmpty() ? title : getString(R.string.wayback_track_channel_name);
        String safeMessage = message != null ? message : "";

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent tap = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            tap = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ensureChannel();
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        builder
            .setContentTitle(safeTitle)
            .setContentText(safeMessage)
            .setSmallIcon(R.drawable.ic_stat_wayback)
            .setColor(getColor(R.color.wayback_notification))
            .setOngoing(true)
            .setShowWhen(false)
            // Полный текст на экране блокировки: секретов в «записываем путь
            // назад» нет, а на телефонах со скрытым содержимым вместо него
            // было бы «Содержимое скрыто» — то есть человек не увидел бы, что
            // приложение пишет его перемещения.
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_NAVIGATION);
        if (tap != null) builder.setContentIntent(tap);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Без этого Android с 12-й версии придерживает уведомление службы
            // десять секунд, чтобы короткие задачи не мигали в шторке. Поход
            // идёт часами, и первые десять секунд человек не видит записи.
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }
        return builder.build();
    }

    private void ensureChannel() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.wayback_track_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(getString(R.string.wayback_track_channel_description));
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.enableLights(false);
        channel.enableVibration(false);
        channel.setSound(null, null);
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        try {
            PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (power == null) return;
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WayBack::TrackService");
            wakeLock.acquire();
        } catch (Exception e) {
            Log.e(TAG, "Could not acquire the wake lock", e);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock == null) return;
        try {
            if (wakeLock.isHeld()) wakeLock.release();
        } catch (Exception e) {
            Log.e(TAG, "Could not release the wake lock", e);
        }
        wakeLock = null;
    }
}
