import { IReadonlyUnorderedMap } from 'frl-ts-utils/lib/collections';
import { IReadonlyObjectVariable } from './readonly-object-variable.interface';
import { IVariable } from '../variable.interface';

export interface IObjectVariablePropertySeeker
{
    seek(variable: IReadonlyObjectVariable): IReadonlyUnorderedMap<string, IVariable>;
}
