import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Public Legal Documents')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('privacy-policy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'View Privacy Policy (개인정보처리방침)' })
  @ApiResponse({ status: 200, description: 'Privacy policy HTML page' })
  getPrivacyPolicy(): string {
    return this.appService.getPrivacyPolicyHtml();
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'View Terms of Service (서비스 이용약관)' })
  @ApiResponse({ status: 200, description: 'Terms of service HTML page' })
  getTerms(): string {
    return this.appService.getTermsHtml();
  }
}
