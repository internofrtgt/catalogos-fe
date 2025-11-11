import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Autenticacion')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: any) {
    return {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    };
  }
}
