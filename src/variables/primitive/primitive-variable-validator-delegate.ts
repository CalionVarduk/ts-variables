import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidatorState } from '../variable-validator-state';

export type PrimitiveVariableValidatorDelegate<T> =
    (value: Nullable<DeepReadonly<T>>) => Nullable<VariableValidatorState> | Promise<Nullable<VariableValidatorState>>;
