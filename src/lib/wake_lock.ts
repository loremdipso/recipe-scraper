let wake_lock: WakeLockSentinel | null = null;
let should_stay_awake = true;

export const set_wake_lock = async (value: boolean) => {
  should_stay_awake = value;
  if (value) {
    await request_wake_lock();
  } else {
    console.info("Disabling wake lock");
    let old_wake_lock = wake_lock;
    wake_lock = null;
    if (old_wake_lock) {
      old_wake_lock.release();
    }
  }
};

const request_wake_lock = async () => {
  try {
    if (wake_lock) {
      try {
        console.info("Releasing old wake lock");
        await wake_lock.release();
      } catch {
        // Do nothing...
      }
    }
    wake_lock = await navigator.wakeLock.request("screen");
    console.info("Wake Lock is active");
  } catch (err) {
    console.error(err);
  }
};

