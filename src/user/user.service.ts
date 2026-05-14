import { Injectable } from '@nestjs/common';
import { DomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';
import { UserI18nKeys } from './user.i18n-keys';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PermissionService } from 'src/permission/permission.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser, UserWithPassword } from './interfaces/user-interface';
import { User } from './schema/user.schema';
import { hasPortalStaffRole } from 'src/rbac/staff-role.util';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  private static readonly DEFAULT_RESET_PASSWORD = '123123123';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly permissionService: PermissionService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Enforces `/api/v1/admin/*` access — active portal staff (`super_admin`…`viewer` or `User.isSuperAdmin`).
   */
  async assertAdminPortalAccess(userId: string): Promise<void> {
    const u = await this.userRepository.findByIdForAdminAccess(userId);

    if (!u) {
      throw new ForbiddenDomainException(
        'Admin access required',
        'ADMIN_PORTAL_REQUIRED',
        UserI18nKeys.adminPortalRequired,
      );
    }
    if (u.deletedAt || !u.isActive) {
      throw new ForbiddenDomainException(
        'Account inactive',
        'ACCOUNT_INACTIVE',
        UserI18nKeys.accountInactive,
      );
    }
    if (u.isSuperAdmin) {
      return;
    }
    if (!hasPortalStaffRole(u.roles ?? [])) {
      throw new ForbiddenDomainException(
        'Admin access required',
        'ADMIN_PORTAL_REQUIRED',
        UserI18nKeys.adminPortalRequired,
      );
    }
  }

  async create(userDto: CreateUserDto): Promise<User> {
    const existedUser = await this.userRepository.findOneByUsernameOrEmail(
      userDto.username,
      userDto.email,
    );
    if (existedUser) {
      throw new DomainException(
        'Username hoặc email đã tồn tại',
        400,
        'DUPLICATE_USERNAME_EMAIL',
        UserI18nKeys.duplicateUsernameEmail,
      );
    }

    const hashedPassword = await bcrypt.hash(userDto.password, 10);

    return this.userRepository.create(userDto, hashedPassword);
  }
  async findForAuth(username: string) {
    return this.userRepository.findForAuth(username);
  }

  findAll() {
    return this.userRepository.findAll();
  }

  async findOneById(id: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findOneByIdForAuth(id);
    if (!user) return null;

    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );

    const { isActive, deletedAt, ...rest } = user as typeof user & {
      isActive?: boolean;
      deletedAt?: Date | null;
    };
    void isActive;
    void deletedAt;

    return {
      ...rest,
      permissions,
      isEmailVerified: (user as { isEmailVerified?: boolean }).isEmailVerified,
    };
  }

  async findOne(username: string): Promise<UserWithPassword | null> {
    const user = await this.userRepository.findOneDocumentByUsername(username);
    if (!user) return null;

    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );

    return {
      ...user.toObject(),
      permissions,
    };
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const dto = { ...updateUserDto };

    if (file) {
      const current = await this.userRepository.findByIdSelectAvatar(userId);
      if (current?.avatar?.publicId) {
        await this.cloudinaryService
          .deleteFile(current.avatar.publicId)
          .catch(() => {});
      }
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: 'users/avatars',
      });
      dto.avatar = { url: result.secure_url, publicId: result.public_id };
    }

    const orConditions: Array<Record<string, unknown>> = [];
    if (dto.username !== undefined)
      orConditions.push({ username: dto.username });
    if (dto.email !== undefined) orConditions.push({ email: dto.email });
    if (orConditions.length > 0) {
      const existed = await this.userRepository.findDuplicateUsernameOrEmail(
        userId,
        orConditions,
      );
      if (existed) {
        throw new DomainException(
          'Username hoặc email đã tồn tại',
          400,
          'DUPLICATE_USERNAME_EMAIL',
          UserI18nKeys.duplicateUsernameEmail,
        );
      }
    }

    const $set: Record<string, unknown> = {};
    if (dto.username !== undefined) $set.username = dto.username;
    if (dto.email !== undefined) $set.email = dto.email;
    if (dto.roles !== undefined) $set.roles = dto.roles;
    if (dto.fullName !== undefined) $set.fullName = dto.fullName;
    if (dto.phone !== undefined) $set.phone = dto.phone;
    if (dto.avatar !== undefined) $set.avatar = dto.avatar;
    if (dto.dateOfBirth !== undefined) $set.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) $set.gender = dto.gender;
    if (dto.address !== undefined) {
      const addr = { ...dto.address };
      const pid = addr.provinceId;
      if (typeof pid === 'string' && Types.ObjectId.isValid(pid)) {
        (addr as Record<string, unknown>).provinceId = new Types.ObjectId(pid);
      }
      $set.address = addr;
    }

    if (dto.password !== undefined) {
      $set.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.userRepository.updateProfileById(userId, $set);
    return withI18nSuccess(
      updated,
      'Profile updated successfully',
      UserI18nKeys.profileUpdated,
    );
  }

  remove(id: string) {
    return this.userRepository.remove(id);
  }

  async resetPasswordToDefault(id: string) {
    const hashedPassword = await bcrypt.hash(
      UserService.DEFAULT_RESET_PASSWORD,
      10,
    );
    return this.userRepository.resetPasswordHashed(id, hashedPassword);
  }

  /** Thêm role vào user (dùng cho TourGuide register). */
  async addRole(userId: string, role: string): Promise<void> {
    await this.userRepository.addRoleIfMissing(userId, role);
  }

  /** Bỏ role khỏi user (dùng cho TourGuide soft delete). */
  async removeRole(userId: string, role: string): Promise<void> {
    await this.userRepository.removeRole(userId, role);
  }

  /** Lấy thông tin cơ bản của user (cho notification). */
  async findBasicInfo(userId: string) {
    return this.userRepository.findBasicInfo(userId);
  }

  /** Tìm _id của users có fullName khớp search (cho TourGuide search). */
  async findIdsByFullNameSearch(search: string): Promise<Types.ObjectId[]> {
    return this.userRepository.findIdsByFullNameSearch(search);
  }
}
