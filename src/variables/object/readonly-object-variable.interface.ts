import { IReadonlyUnorderedMap } from 'frl-ts-utils/lib/collections';
import { IEvent } from 'frl-ts-utils/lib/events';
import { IVariable } from '../variable.interface';
import { ObjectVariableValue } from './object-variable-value';
import { IObjectVariableChangeTracker } from './object-variable-change-tracker.interface';
import { IObjectVariableValidator } from './object-variable-validator.interface';
import { ObjectVariableResetEvent } from './object-variable-reset-event';

export interface IReadonlyObjectVariable
    extends
    IVariable<ObjectVariableValue>
{
    readonly changeTracker: IObjectVariableChangeTracker;
    readonly validator: IObjectVariableValidator;

    readonly onReset: IEvent<ObjectVariableResetEvent>;

    getTrackedProperties(): IReadonlyUnorderedMap<string, IVariable>;
}
