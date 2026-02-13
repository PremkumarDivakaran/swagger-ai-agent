package com.api.tests;

import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class Productslimit1ApiTest extends BaseTest {
    @Test
    @Order(1)
    @DisplayName("GET /products?limit=1 (getAllProducts_limitParam)")
    public void getAllProducts_limitParam() {
        given().spec(spec)
                .queryParam("limit", 1)
                .when().get("/products")
                .then().statusCode(403);
    }
}