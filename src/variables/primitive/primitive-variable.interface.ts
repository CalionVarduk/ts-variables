import { Nullable } from 'frl-ts-utils/lib/types';
import { IReadonlyPrimitiveVariable } from './readonly-primitive-variable.interface';

export interface IPrimitiveVariable<T = any>
    extends
    IReadonlyPrimitiveVariable<T>
{
    reset(): void;
    tryUpdate(value: Nullable<T>): boolean;
    update(value: Nullable<T>): void;
}
