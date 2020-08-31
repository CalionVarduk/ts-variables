import { VariableValidationAction } from '../variable-validation-action.abstract';
import { ObjectVariableValue } from './object-variable-value';
import { IVariable } from '../variable.interface';
import { IReadonlyUnorderedMap, Iteration } from 'frl-ts-utils/lib/collections';

export class ObjectVariableValidationAction
    extends
    VariableValidationAction<ObjectVariableValue>
{
    public get variables(): ReadonlyArray<IVariable>
    {
        return this._variables;
    }

    private readonly _variables: IVariable[];

    public constructor()
    {
        super();
        this._variables = [];
    }

    public dispose(): void
    {
        this._variables.splice(0);
    }

    public configure(properties: IReadonlyUnorderedMap<string, IVariable>): void
    {
        this._variables.splice(0);

        this._variables.push(
            ...Iteration.Filter(
                properties.values(),
                v => !v.validator.isAsync));
    }

    public invoke(): null
    {
        this._variables.forEach(v => v.validator.validate());
        return null;
    }
}
