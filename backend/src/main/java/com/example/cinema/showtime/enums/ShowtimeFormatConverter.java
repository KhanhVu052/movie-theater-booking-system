package com.example.cinema.showtime.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ShowtimeFormatConverter implements AttributeConverter<ShowtimeFormat, String> {

    @Override
    public String convertToDatabaseColumn(ShowtimeFormat attribute) {
        return attribute == null ? null : attribute.getDbValue();
    }

    @Override
    public ShowtimeFormat convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ShowtimeFormat.fromValue(dbData);
    }
}