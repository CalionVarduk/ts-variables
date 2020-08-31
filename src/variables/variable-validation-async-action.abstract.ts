import { Nullable } from 'frl-ts-utils/lib/types';
import { IDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { SkippableAction } from 'frl-ts-utils/lib/skippable-action';
import { VariableValidationResult } from './variable-validation-result';
import { VariableValidationParams } from './variable-validation-params';

export type VariableValidationAsyncActionParams<T = any> =
    VariableValidationParams<T> &
    {
        onEnd(result: Nullable<VariableValidationResult>, value: T, args?: any): void;
    };

export abstract class VariableValidationAsyncAction<T = any>
    implements
    IDisposable
{
    public get isBusy(): boolean
    {
        return this._action.isInvoking;
    }

    private readonly _action: SkippableAction<VariableValidationAsyncActionParams<T>>;

    protected constructor()
    {
        this._action = new SkippableAction<VariableValidationAsyncActionParams<T>>(async params =>
            {
                const result = await this.invoke(params!.value);
                params!.onEnd(result, params!.value, params!.args);
            });
    }

    public dispose(): void {}

    public async begin(params: VariableValidationAsyncActionParams<T>): Promise<void>
    {
        await (this.isBusy ?
            this._action.invoke(params).then(() => this._action.current()!) :
            this._action.invoke(params));
    }

    protected abstract invoke(value: T): Promise<Nullable<VariableValidationResult>>;
}
