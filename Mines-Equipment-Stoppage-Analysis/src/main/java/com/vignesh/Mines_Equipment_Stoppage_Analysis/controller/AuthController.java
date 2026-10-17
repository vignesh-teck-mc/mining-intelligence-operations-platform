package com.vignesh.Mines_Equipment_Stoppage_Analysis.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final HttpSessionSecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();
    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
       return Map.of(
          "token", csrfToken.getToken(),
          "headerName", csrfToken.getHeaderName()
       );
    }
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @RequestBody LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {

        String expectedUsername = System.getenv("APP_ADMIN_USERNAME");
        String expectedPassword = System.getenv("APP_ADMIN_PASSWORD");

        if (expectedUsername == null || expectedUsername.isBlank()
                || expectedPassword == null || expectedPassword.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Login credentials are not configured on the server."));
        }

        if (body == null || body.username() == null || body.password() == null
                || !constantTimeEquals(expectedUsername, body.username())
                || !constantTimeEquals(expectedPassword, body.password())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password."));
        }

        HttpSession oldSession = request.getSession(false);
        if (oldSession != null) {
            oldSession.invalidate();
        }

        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        expectedUsername,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        request.getSession(true);
        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok(Map.of(
                "message", "Login successful.",
                "username", expectedUsername
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, String>> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Not logged in."));
        }

        return ResponseEntity.ok(Map.of(
                "username", authentication.getName(),
                "role", "ADMIN"
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        SecurityContextHolder.clearContext();
        securityContextRepository.saveContext(
                SecurityContextHolder.createEmptyContext(), request, response);

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    private boolean constantTimeEquals(String expected, String supplied) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8)
        );
    }

    public record LoginRequest(String username, String password) {}
}
