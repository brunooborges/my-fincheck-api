import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from 'src/shared/database/repositories/categories.repositories';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ValidateCategoryOwnershipService } from './validate-category-ownership.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepo: CategoriesRepository,
    private validateCategoryOwnershipService: ValidateCategoryOwnershipService,
  ) {}

  findAllByUserId(userId: string) {
    return this.categoriesRepo.findMany({
      where: { userId },
    });
  }

  create(userId: string, createCategoryDto: CreateCategoryDto) {
    const { name, icon, type } = createCategoryDto;
    return this.categoriesRepo.create({
      data: {
        userId,
        name,
        icon,
        type,
      },
    });
  }

  async update(
    userId: string,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    await this.validateCategoryOwnershipService.validate(userId, categoryId);

    const { icon, name, type } = updateCategoryDto;

    return await this.categoriesRepo.update({
      where: { id: categoryId },
      data: {
        icon,
        name,
        type,
      },
    });
  }

  async delete(userId: string, categoryId: string) {
    await this.validateCategoryOwnershipService.validate(userId, categoryId);

    await this.categoriesRepo.delete({
      where: { id: categoryId },
    });

    return null;
  }
}
