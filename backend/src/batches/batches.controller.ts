import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateProducerBatchDto } from './dto/create-producer-batch.dto';
import { InspectBatchDto } from './dto/inspect-batch.dto';
import { TransportBatchDto } from './dto/transport-batch.dto';
import { DistributeBatchDto } from './dto/distribute-batch.dto';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post('producer')
  recordProducer(@Body() dto: CreateProducerBatchDto) {
    return this.batchesService.recordProducer(dto);
  }

  @Post('inspector')
  recordInspector(@Body() dto: InspectBatchDto) {
    return this.batchesService.recordInspector(dto);
  }

  @Post('logistics')
  recordLogistics(@Body() dto: TransportBatchDto) {
    return this.batchesService.recordLogistics(dto);
  }

  @Post('distributor')
  recordDistributor(@Body() dto: DistributeBatchDto) {
    return this.batchesService.recordDistributor(dto);
  }

  @Patch(':batchId/tx')
  updateTx(
    @Param('batchId') batchId: string,
    @Body() body: { stage: string; txHash: string },
  ) {
    return this.batchesService.updateTxHash(batchId, body.stage, body.txHash);
  }

  @Get('stats')
  getStats() {
    return this.batchesService.getStats();
  }

  @Get()
  findAll(@Query('stage') stage?: string) {
    return this.batchesService.findAll(stage);
  }

  @Get(':batchId')
  findByBatchId(@Param('batchId') batchId: string) {
    return this.batchesService.findByBatchId(batchId);
  }
}
