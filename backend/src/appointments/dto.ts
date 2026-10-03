import { IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { AppointmentStatus } from './appointment.entity';

export class CreateAppointmentDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  appointmentDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  chatSessionId?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string | null;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
