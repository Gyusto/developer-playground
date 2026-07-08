import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access/access-control.service';
import { CryptoService } from './crypto/crypto.service';
import { WorkspaceGuard } from './guards/workspace.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditService } from '../audit-logs/audit.service';

/** Shared, app-wide providers (RBAC, crypto, audit) available everywhere. */
@Global()
@Module({
  providers: [
    AccessControlService,
    CryptoService,
    AuditService,
    WorkspaceGuard,
    RolesGuard,
  ],
  exports: [
    AccessControlService,
    CryptoService,
    AuditService,
    WorkspaceGuard,
    RolesGuard,
  ],
})
export class CommonModule {}
