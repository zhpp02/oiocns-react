import React from 'react';
import { schema } from '@/ts/base';
import orgCtrl from '@/ts/controller';
import { IDirectory, IEntity, ITarget } from '@/ts/core';
import WorkForm from './workForm';
import DirectoryForm from './directoryForm';
import ApplicationForm from './applicationForm';
import SpeciesForm from './speciesForm';
import PropertyForm from './propertyForm';
import TargetForm from './targetForm';
import LabelsForm from './labelsForm';
import RenameForm from './renameForm';
import LabelsReport from './labelsReport';
interface IProps {
  cmd: string;
  entity: IEntity<schema.XEntity>;
  finished: () => void;
}

const EntityForm: React.FC<IProps> = ({ cmd, entity, finished }) => {
  const reloadFinish = () => {
    finished();
    if (!cmd.startsWith('remark')) {
      orgCtrl.changCallback();
    }
  };
  switch (cmd) {
    case 'rename':
      return <RenameForm file={entity as any} finished={reloadFinish} />;
    case 'newDir':
    case 'updateDir':
    case 'remarkDir': {
      const directory = entity as IDirectory;
      if (!directory.parent && cmd !== 'newDir') {
        return (
          <TargetForm
            formType={cmd.replace('Dir', '')}
            target={directory.target}
            finished={reloadFinish}
          />
        );
      }
      return <DirectoryForm formType={cmd} current={directory} finished={reloadFinish} />;
    }
    case 'newApp':
    case 'newModule':
    case 'updateApp':
    case 'updateModule':
    case 'remarkApp':
      return (
        <ApplicationForm formType={cmd} current={entity as any} finished={reloadFinish} />
      );
    case 'newWork':
    case 'updateWork':
    case 'remarkWork':
      return <WorkForm formType={cmd} current={entity as any} finished={reloadFinish} />;
    case 'newSpecies':
    case 'updateSpecies':
    case 'remarkSpecies':
    case 'newDict':
    case 'updateDict':
    case 'remarkDict':
      return (
        <SpeciesForm
          formType={cmd.replace('Dict', '').replace('Species', '')}
          typeName={cmd.includes('Dict') ? '字典' : '分类'}
          current={entity as any}
          finished={reloadFinish}
        />
      );
    case 'newWorkConfig':
    case 'updateWorkConfig':
    case 'remarkWorkConfig':
    case 'newThingConfig':
    case 'updateThingConfig':
    case 'remarkThingConfig':
      return (
        <LabelsForm
          formType={cmd.replace('WorkConfig', '').replace('ThingConfig', '')}
          typeName={cmd.includes('WorkConfig') ? '事项配置22' : '实体配置'}
          current={entity as any}
          finished={reloadFinish}
        />
      );
    case 'newReport':
      return (
        <LabelsReport
          formType={cmd.replace('Report', '')}
          current={entity as any}
          finished={reloadFinish}
        />
      );
    case 'newProperty':
    case 'updateProperty':
    case 'remarkProperty':
      return (
        <PropertyForm formType={cmd} current={entity as any} finished={reloadFinish} />
      );
    default: {
      const target = cmd.startsWith('new')
        ? (entity as IDirectory).target
        : (entity as ITarget);
      return <TargetForm formType={cmd} target={target} finished={reloadFinish} />;
    }
  }
};

export default EntityForm;
