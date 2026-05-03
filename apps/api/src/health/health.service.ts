import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { runInfrastructurePreflight } from './preflight-checks';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async preflight() {
    return runInfrastructurePreflight(this.prisma);
  }
}
