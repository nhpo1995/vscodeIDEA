interface RetryPolicy {
    int nextAttempt(int current);
}

final class RetryService implements RetryPolicy {
    private static final int MAX_RETRIES = 3;
    private final int initialRetries = 1;
    private int attempts = 0;
    private int UPPER_MUTABLE = 2;

    @Override
    public int nextAttempt(int current) {
        final int LOCAL_LIMIT = MAX_RETRIES;
        final int localCount = 1;
        int UPPER_LOCAL = 2;
        int remaining = MAX_RETRIES - current;
        return Math.min(remaining, LOCAL_LIMIT)
            + attempts + initialRetries + UPPER_MUTABLE + localCount + UPPER_LOCAL;
    }
}
