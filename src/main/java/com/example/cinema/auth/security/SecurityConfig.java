package com.example.cinema.auth.security;

import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login").permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/genres/**",
                                "/api/v1/actors/**",
                                "/api/v1/movies/**"
                        ).permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/genres/**",
                                "/api/v1/actors/**",
                                "/api/v1/movies/**",
                                "/api/v1/cinemas/**",
                                "/api/v1/rooms/**",
                                "/api/v1/showtimes/**"
                        ).permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/genres/**",
                                "/api/v1/actors/**",
                                "/api/v1/movies/**",
                                "/api/v1/cinemas/**",
                                "/api/v1/rooms/**",
                                "/api/v1/showtimes/**",
                                "/api/v1/vouchers/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) ->
                                handlerExceptionResolver.resolveException(
                                        request, response, null, new AppException(ErrorCode.UNAUTHENTICATED)
                                )
                        )
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                handlerExceptionResolver.resolveException(
                                        request, response, null, new AppException(ErrorCode.UNAUTHORIZED)
                                )
                        )
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}