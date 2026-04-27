import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(createUnitDto: CreateUnitDto) {
    return this.prisma.units.create({
      data: createUnitDto,
    });
  }

  async findAll() {
    return this.prisma.units.findMany({
      orderBy: { order_index: 'asc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.units.findUnique({
      where: { id },
      include: {
        questions: true, // 단원 조회 시 포함된 문제들도 함께 가져올 수 있게 설정
      },
    });
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto) {
    try {
      return await this.prisma.units.update({
        where: { id },
        data: updateUnitDto,
      });
    } catch (error) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.units.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }
  }
}
