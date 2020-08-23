import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidatorState } from '../variable-validator-state';

export type PrimitiveVariableValidatorCallback<T> =
    (value: Nullable<DeepReadonly<T>>) => Nullable<VariableValidatorState> | Promise<Nullable<VariableValidatorState>>;
