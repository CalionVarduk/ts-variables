import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { IVariableChangeTracker } from '../variable-change-tracker.interface';
import { PrimitiveVariableChanges } from './primitive-variable-changes';

export interface IPrimitiveVariableChangeTracker<T = any>
    extends
    IVariableChangeTracker<Nullable<DeepReadonly<T>>>
{
    readonly changes: Nullable<PrimitiveVariableChanges<T>>;
}
