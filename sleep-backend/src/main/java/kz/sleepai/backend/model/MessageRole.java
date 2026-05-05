package kz.sleepai.backend.model;

public enum MessageRole {
    USER("user"),
    ASSISTANT("assistant");

    private final String value;

    MessageRole(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
