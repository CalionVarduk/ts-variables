import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { IEvent } from 'frl-ts-utils/lib/events';
import { IVariable } from '../variable.interface';
import { IPrimitiveVariableChangeTracker } from './primitive-variable-change-tracker.interface';
import { IPrimitiveVariableValidator } from './primitive-variable-validator.interface';
import { PrimitiveVariableValueChangingEvent } from './primitive-variable-value-changing-event';
import { PrimitiveVariableValueChangedEvent } from './primitive-variable-value-changed-event';
import { PrimitiveVariableValueChangeCancelledEvent } from './primitive-variable-value-change-cancelled-event';

export interface IReadonlyPrimitiveVariable<T = any>
    extends
    IVariable<Nullable<DeepReadonly<T>>>
{
    readonly changeTracker: IPrimitiveVariableChangeTracker<T>;
    readonly validator: IPrimitiveVariableValidator<T>;

    readonly onValueChanging: IEvent<PrimitiveVariableValueChangingEvent<T>>;
    readonly onValueChanged: IEvent<PrimitiveVariableValueChangedEvent<T>>;
    readonly onValueChangeCancelled: IEvent<PrimitiveVariableValueChangeCancelledEvent<T>>;
}
