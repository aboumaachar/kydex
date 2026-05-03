import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IntegrationsService } from './integrations.service';

@Injectable()
export class IntegrationApiKeyGuard implements CanActivate {
  constructor(private readonly integrationsService: IntegrationsService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const rawKey = this.extractRawKey(request);
    if (!rawKey) {
      throw new UnauthorizedException('Integration API key is required');
    }

    const actor = await this.integrationsService.validateApiKey(
      rawKey,
      request.headers.origin as string | undefined,
      request.ip as string | undefined,
      request.headers['user-agent'] as string | undefined,
    );

    request.user = {
      id: actor.apiKeyId,
      tenantId: actor.tenantId,
      role: UserRole.API_CLIENT,
      apiKeyId: actor.apiKeyId,
      apiKeyName: actor.name,
      integrationCapabilities: actor.capabilities,
    };

    return true;
  }

  private extractRawKey(request: { headers: Record<string, string | string[] | undefined> }) {
    const headerValue = request.headers['x-api-key'];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    const authorization = request.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    return null;
  }
}