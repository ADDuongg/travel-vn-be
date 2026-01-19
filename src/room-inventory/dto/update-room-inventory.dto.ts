import { PartialType } from '@nestjs/swagger';
import { CreateRoomInventoryDto } from './create-room-inventory.dto';

export class UpdateRoomInventoryDto extends PartialType(CreateRoomInventoryDto) {}
