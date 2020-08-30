import { IReadonlyObjectVariable } from './readonly-object-variable.interface';

export interface IObjectVariable
    extends
    IReadonlyObjectVariable
{
    reset(): void;
}
