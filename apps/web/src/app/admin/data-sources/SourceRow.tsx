import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ActionMenu } from './ActionMenu';

export interface SourceRowProps {
  code: string;
  name: string;
  status: string;
  lastSync: string;
  activeVersion: string;
  recordCount: number;
  health: string;
  latestVersionId: string | null;
  onSync: (code: string) => void;
  onToggleEnabled: (code: string, nextStatus: 'ACTIVE' | 'DISABLED') => void;
  onViewVersions: (code: string) => void;
  onViewRecords: (code: string) => void;
  onViewReport: (code: string, versionId: string) => void;
  onViewSyncHistory: (code: string) => void;
}

export const SourceRow: React.FC<SourceRowProps> = (props) => (
  <tr>
    <td>{props.name}</td>
    <td>{props.code}</td>
    <td>{props.status}</td>
    <td>{props.lastSync}</td>
    <td>{props.activeVersion}</td>
    <td>{props.recordCount.toLocaleString()}</td>
    <td><StatusBadge health={props.health} /></td>
    <td>
      <ActionMenu
        code={props.code}
        status={props.status}
        latestVersionId={props.latestVersionId}
        onSync={props.onSync}
        onToggleEnabled={props.onToggleEnabled}
        onViewVersions={props.onViewVersions}
        onViewRecords={props.onViewRecords}
        onViewReport={props.onViewReport}
        onViewSyncHistory={props.onViewSyncHistory}
      />
    </td>
  </tr>
);
