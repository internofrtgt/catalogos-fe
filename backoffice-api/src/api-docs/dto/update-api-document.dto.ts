import { PartialType } from '@nestjs/mapped-types';
import { CreateApiDocumentDto } from './create-api-document.dto';

export class UpdateApiDocumentDto extends PartialType(CreateApiDocumentDto) {}
