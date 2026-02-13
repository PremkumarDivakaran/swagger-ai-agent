package com.api.tests.config;

public class ApiConfig {
    private static final String DEFAULT_BASE_URL = "https://fakestoreapi.com";

    public static String getBaseUrl() {
        String envUrl = System.getenv("API_BASE_URL");
        if (envUrl != null && !envUrl.isEmpty()) return envUrl;
        String propUrl = System.getProperty("api.base.url");
        if (propUrl != null && !propUrl.isEmpty()) return propUrl;
        return DEFAULT_BASE_URL;
    }
}
