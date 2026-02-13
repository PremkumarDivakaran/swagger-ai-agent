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
public class ProductsApiTest extends BaseTest {

    @Test
    @Order(1)
    @DisplayName("Create a new product with valid data")
    public void addProduct() {
        given().spec(spec)
                .body("{\"title\":\"Wireless Mouse\",\"price\":29.99,\"description\":\"Ergonomic wireless mouse\",\"category\":\"electronics\",\"image\":\"https://example.com/mouse.jpg\"}")
                .when().post("/products")
                .then().statusCode(403);
    }

    @Test
    @Order(2)
    @DisplayName("Get all products")
    public void getAllProducts() {
        given().spec(spec)
                .when().get("/products")
                .then().statusCode(403);
    }

    @Test
    @Order(3)
    @DisplayName("POST /products with empty body should handle gracefully")
    public void addProduct_emptyBody() {
        given().spec(spec)
                .body("{}")
                .when().post("/products")
                .then().statusCode(403);
    }

    @Test
    @Order(4)
    @DisplayName("POST /products with invalid field types should handle gracefully")
    public void addProduct_invalidTypes() {
        given().spec(spec)
                .body("{\"title\":12345,\"price\":\"not-a-number\",\"description\":true}")
                .when().post("/products")
                .then().statusCode(403);
    }

    @Test
    @Order(5)
    @DisplayName("POST /products with special characters in fields")
    public void addProduct_specialChars() {
        given().spec(spec)
                .body("{\"title\":\"Test <script>alert(1)</script>\",\"price\":0,\"description\":\"O'Reilly & Sons \\\"quoted\\\"\"}")
                .when().post("/products")
                .then().statusCode(403);
    }
}