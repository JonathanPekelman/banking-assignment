import { z } from 'zod';

import { PipeTransform, BadRequestException } from '@nestjs/common';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }

    return result.data;
  }
}
