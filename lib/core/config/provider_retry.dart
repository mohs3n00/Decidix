/// Riverpod 3 retries a failed provider on its own, with growing delays, and
/// shows a spinner meanwhile. The screens have their own error view with a
/// retry button, so the app turns the automatic retry off.
Duration? noAutomaticRetry(int retryCount, Object error) => null;
