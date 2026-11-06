package com.example.cinema.booking.config;

import com.example.cinema.showtime.config.ShowtimeProperties;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

public class PropertiesValidationUnitTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("AF-08 / D-09: BookingProperties holdMinutes within [1, 10] passes validation")
    void testHoldMinutesValidRange() {
        BookingProperties properties = new BookingProperties();
        properties.setHoldMinutes(10);
        Set<ConstraintViolation<BookingProperties>> violations = validator.validate(properties);
        assertThat(violations).isEmpty();

        properties.setHoldMinutes(1);
        violations = validator.validate(properties);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("AF-08 / D-09: BookingProperties holdMinutes < 1 or > 10 fails validation")
    void testHoldMinutesInvalid() {
        BookingProperties properties = new BookingProperties();

        properties.setHoldMinutes(0);
        Set<ConstraintViolation<BookingProperties>> minViolations = validator.validate(properties);
        assertThat(minViolations).isNotEmpty();
        assertThat(minViolations.iterator().next().getMessage()).contains("must be greater than or equal to 1");

        properties.setHoldMinutes(11);
        Set<ConstraintViolation<BookingProperties>> maxViolations = validator.validate(properties);
        assertThat(maxViolations).isNotEmpty();
        assertThat(maxViolations.iterator().next().getMessage()).contains("must be less than or equal to 10");
    }

    @Test
    @DisplayName("AF-08: ShowtimeProperties cleaningMinutes >= 0 passes, < 0 fails")
    void testShowtimePropertiesValidation() {
        ShowtimeProperties properties = new ShowtimeProperties();
        properties.setCleaningMinutes(15);
        assertThat(validator.validate(properties)).isEmpty();

        properties.setCleaningMinutes(-1);
        Set<ConstraintViolation<ShowtimeProperties>> violations = validator.validate(properties);
        assertThat(violations).isNotEmpty();
    }
}
