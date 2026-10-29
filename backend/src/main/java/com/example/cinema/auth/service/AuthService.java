package com.example.cinema.auth.service;

import com.example.cinema.auth.dto.request.LoginRequest;
import com.example.cinema.auth.dto.request.RegisterRequest;
import com.example.cinema.auth.dto.response.AuthResponse;
import com.example.cinema.auth.dto.response.UserResponse;
import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.mapper.UserMapper;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.auth.security.JwtService;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.common.exception.AppException;
import com.example.cinema.common.exception.ErrorCode;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthService {

    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    JwtService jwtService;
    AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        User savedUser = userRepository.save(userMapper.toEntity(request, encodedPassword));

        return buildAuthResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email().trim().toLowerCase(),
                            request.password()
                    )
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            return buildAuthResponse(principal.getUser());

        } catch (DisabledException ex) {
            throw new AppException(ErrorCode.USER_INACTIVE);
        } catch (BadCredentialsException | InternalAuthenticationServiceException ex) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UserPrincipal principal) {
        return userMapper.toUserResponse(principal.getUser());
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user);
        UserResponse userResponse = userMapper.toUserResponse(user);
        return AuthResponse.of(accessToken, jwtService.getJwtExpiration(), userResponse);
    }
}