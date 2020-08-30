import { isInstanceOfType } from 'frl-ts-utils/lib/functions';
import { IReadonlyUnorderedMap, UnorderedMap } from 'frl-ts-utils/lib/collections';
import { IObjectVariablePropertySeeker } from './object-variable-property-seeker.interface';
import { IReadonlyObjectVariable } from './readonly-object-variable.interface';
import { IVariable } from '../variable.interface';
import { VariableBase } from '../variable-base.abstract';

export type ObjectVariablePropertyDto =
{
    name: string;
    readonly variable: IVariable;
};

export class ObjectVariablePropertySeeker
    implements
    IObjectVariablePropertySeeker
{
    public seek(variable: IReadonlyObjectVariable): IReadonlyUnorderedMap<string, IVariable>
    {
        const properties = this.prepare(variable);
        const result = new UnorderedMap<string, IVariable>();

        for (const p of properties)
            if (!result.tryAdd(p.name, p.variable))
                throw new Error(`duplicate property name found: ${p.name}`);

        return result;
    }

    protected prepare(variable: IReadonlyObjectVariable): Iterable<ObjectVariablePropertyDto>
    {
        const variableObj: any = variable;
        const readPropertiesSet = new Set<VariableBase>();
        const result: ObjectVariablePropertyDto[] = [];

        for (const propertyName of Object.getOwnPropertyNames(variable))
        {
            const propertyVariable = variableObj[propertyName];
            if (!isInstanceOfType(VariableBase, propertyVariable) || !readPropertiesSet.add(propertyVariable))
                continue;

            const entry: ObjectVariablePropertyDto = {
                name: propertyName,
                variable: propertyVariable
            };
            result.push(entry);
        }
        return result;
    }
}
