import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  create(@Req() request: Request, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(request.user!.id, dto);
  }

  @Get()
  findAll(@Req() request: Request) {
    return this.appointments.findAll(request.user!.id);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id') id: string) {
    return this.appointments.findOne(request.user!.id, id);
  }

  @Patch(':id')
  update(@Req() request: Request, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointments.update(request.user!.id, id, dto);
  }
}
