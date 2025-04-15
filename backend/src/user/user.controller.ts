import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserRoleDto } from './dto/update-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint GET /users
   * Accessible uniquement pour les administrateurs.
   */
  @Get()
  @Roles('admin')
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }

  /**
   * Endpoint PATCH /users/:id/role
   * Permet à un admin de mettre à jour le rôle d’un utilisateur.
   */
  @Patch(':id/role')
  @Roles('admin')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return await this.userService.updateUserRole(id, updateUserRoleDto.role);
  }
}
