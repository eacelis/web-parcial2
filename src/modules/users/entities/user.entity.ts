import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  LIBRARIAN = 'librarian',
  MEMBER = 'member',
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'UUID del usuario' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Email del usuario' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @ApiProperty({ enum: UserRole, description: 'Rol del usuario' })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @ApiProperty({ description: 'Si el usuario está activo' })
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
