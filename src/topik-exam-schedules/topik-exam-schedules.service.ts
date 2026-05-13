import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopikExamScheduleDto } from './dto/create-topik-exam-schedule.dto';
import { UpdateTopikExamScheduleDto } from './dto/update-topik-exam-schedule.dto';

type ScheduleRecord = {
  id: string;
  exam_name: string;
  exam_date: bigint;
  registration_start_at: bigint;
  registration_end_at: bigint;
  result_date: bigint;
  location: string;
  fee: number;
  registration_url: string;
  is_active: number;
  display_order: number;
  created_at: bigint;
  updated_at: bigint;
};

@Injectable()
export class TopikExamSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeData(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.serializeData(item));
    }

    if (typeof data === 'bigint') {
      return data.toString();
    }

    if (typeof data === 'object') {
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>,
      )) {
        serialized[key] = this.serializeData(value);
      }
      return serialized;
    }

    return data;
  }

  private toTimestamp(value: string) {
    return BigInt(new Date(value).getTime());
  }

  private withComputedFields(schedule: ScheduleRecord) {
    const now = Date.now();
    const examDate = Number(schedule.exam_date);
    const diffInDays = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

    return {
      ...schedule,
      d_day:
        diffInDays > 0
          ? `D-${diffInDays}`
          : diffInDays === 0
            ? 'D-Day'
            : `D+${Math.abs(diffInDays)}`,
      exam_date_label: new Date(Number(schedule.exam_date))
        .toISOString()
        .slice(0, 10),
      registration_period_label: `${new Date(
        Number(schedule.registration_start_at),
      )
        .toISOString()
        .slice(5, 10)} ~ ${new Date(Number(schedule.registration_end_at))
        .toISOString()
        .slice(5, 10)}`,
      result_date_label: new Date(Number(schedule.result_date))
        .toISOString()
        .slice(0, 10),
      fee_label: `${schedule.fee.toLocaleString()} KRW`,
    };
  }

  async findAll() {
    const schedules = await this.prisma.topik_exam_schedules.findMany({
      where: { is_active: 1 },
      orderBy: [{ exam_date: 'asc' }, { display_order: 'asc' }],
    });

    return this.serializeData(
      schedules.map((schedule) => this.withComputedFields(schedule)),
    );
  }

  async findNext() {
    const now = BigInt(Date.now());
    const schedule = await this.prisma.topik_exam_schedules.findFirst({
      where: {
        is_active: 1,
        exam_date: {
          gte: now,
        },
      },
      orderBy: [{ exam_date: 'asc' }, { display_order: 'asc' }],
    });

    if (!schedule) {
      return null;
    }

    return this.serializeData(this.withComputedFields(schedule));
  }

  async create(createDto: CreateTopikExamScheduleDto) {
    const now = BigInt(Date.now());
    const schedule = await this.prisma.topik_exam_schedules.create({
      data: {
        exam_name: createDto.exam_name,
        exam_date: this.toTimestamp(createDto.exam_date),
        registration_start_at: this.toTimestamp(
          createDto.registration_start_at,
        ),
        registration_end_at: this.toTimestamp(createDto.registration_end_at),
        result_date: this.toTimestamp(createDto.result_date),
        location: createDto.location,
        fee: createDto.fee,
        registration_url: createDto.registration_url,
        is_active: createDto.is_active ?? 1,
        display_order: createDto.display_order ?? 0,
        created_at: now,
        updated_at: now,
      },
    });

    return this.serializeData(this.withComputedFields(schedule));
  }

  async update(id: string, updateDto: UpdateTopikExamScheduleDto) {
    const existing = await this.prisma.topik_exam_schedules.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `TOPIK exam schedule with ID ${id} not found`,
      );
    }

    const schedule = await this.prisma.topik_exam_schedules.update({
      where: { id },
      data: {
        ...(updateDto.exam_name !== undefined
          ? { exam_name: updateDto.exam_name }
          : {}),
        ...(updateDto.exam_date !== undefined
          ? { exam_date: this.toTimestamp(updateDto.exam_date) }
          : {}),
        ...(updateDto.registration_start_at !== undefined
          ? {
              registration_start_at: this.toTimestamp(
                updateDto.registration_start_at,
              ),
            }
          : {}),
        ...(updateDto.registration_end_at !== undefined
          ? {
              registration_end_at: this.toTimestamp(
                updateDto.registration_end_at,
              ),
            }
          : {}),
        ...(updateDto.result_date !== undefined
          ? { result_date: this.toTimestamp(updateDto.result_date) }
          : {}),
        ...(updateDto.location !== undefined
          ? { location: updateDto.location }
          : {}),
        ...(updateDto.fee !== undefined ? { fee: updateDto.fee } : {}),
        ...(updateDto.registration_url !== undefined
          ? { registration_url: updateDto.registration_url }
          : {}),
        ...(updateDto.is_active !== undefined
          ? { is_active: updateDto.is_active }
          : {}),
        ...(updateDto.display_order !== undefined
          ? { display_order: updateDto.display_order }
          : {}),
        updated_at: BigInt(Date.now()),
      },
    });

    return this.serializeData(this.withComputedFields(schedule));
  }

  async remove(id: string) {
    const existing = await this.prisma.topik_exam_schedules.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `TOPIK exam schedule with ID ${id} not found`,
      );
    }

    const schedule = await this.prisma.topik_exam_schedules.delete({
      where: { id },
    });

    return this.serializeData(this.withComputedFields(schedule));
  }
}
