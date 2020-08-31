import { Iteration, IReadonlyUnorderedMap } from 'frl-ts-utils/lib/collections';
import { VariableValidationAsyncAction } from '../variable-validation-async-action.abstract';
import { ObjectVariableValue } from './object-variable-value';
import { IVariable } from '../variable.interface';

export class ObjectVariableValidationAsyncAction
    extends
    VariableValidationAsyncAction<ObjectVariableValue>
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
                v => v.validator.isAsync));
    }

    protected async invoke(): Promise<null>
    {
        await Promise.all(
            Iteration.FilterNotUndefined(
                Iteration.Map(
                    this._variables,
                    v => v.validator.validate())));

        return null;
    }
}
