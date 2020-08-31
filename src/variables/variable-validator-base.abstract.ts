import { Nullable, Undefinable } from 'frl-ts-utils/lib/types';
import { isDefined, Assert, isNull } from 'frl-ts-utils/lib/functions';
import { IDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { IEvent, EventHandler } from 'frl-ts-utils/lib/events';
import { IVariableValidator } from './variable-validator.interface';
import { VariableValidatorState } from './variable-validator-state';
import { VariableValidatedEvent } from './variable-validated-event';
import { IVariable } from './variable.interface';
import { VariableValidationResult } from './variable-validation-result';
import { VariableValidationAction } from './variable-validation-action.abstract';
import { VariableValidationAsyncAction, VariableValidationAsyncActionParams } from './variable-validation-async-action.abstract';
import { VariableValidationParams } from './variable-validation-params';
import { VariableValidatorFinishMode } from './variable-validator-finish-mode.enum';

export type VariableValidatorBaseParams<T = any> =
{
    readonly attach?: boolean;
    readonly alwaysFinishSyncValidation?: boolean;
    readonly validationAction?: Nullable<VariableValidationAction<T>>;
    readonly asyncValidationAction?: Nullable<VariableValidationAsyncAction<T>>;
};

export abstract class VariableValidatorBase<T = any>
    implements
    IVariableValidator,
    IDisposable
{
    public get isDisposed(): boolean
    {
        return this._onValidated.isDisposed;
    }

    public get isBusy(): boolean
    {
        return this.isAsync && this.asyncValidationAction!.isBusy;
    }

    public get isAsync(): boolean
    {
        return !isNull(this.asyncValidationAction);
    }

    public get isAttached(): boolean
    {
        return this._isAttached;
    }

    public get isValid(): boolean
    {
        return isNull(this.state.errors) || this.state.errors.length === 0;
    }

    public get hasWarnings(): boolean
    {
        return !isNull(this.state.warnings) && this.state.warnings.length > 0;
    }

    public get isAlwaysFinishingSyncValidation(): boolean
    {
        return this._isAlwaysFinishingSyncValidation;
    }

    public abstract get state(): VariableValidatorState;

    public get onValidated(): IEvent<VariableValidatedEvent>
    {
        return this._onValidated;
    }

    protected get linkedVariable(): Nullable<IVariable<T>>
    {
        return this._linkedVariable;
    }

    protected readonly validationAction: Nullable<VariableValidationAction<T>>;
    protected readonly asyncValidationAction: Nullable<VariableValidationAsyncAction<T>>;

    private readonly _onValidated: EventHandler<VariableValidatedEvent>;
    private readonly _isAlwaysFinishingSyncValidation: boolean;

    private _linkedVariable: Nullable<IVariable<T>>;
    private _isAttached: boolean;

    protected constructor(params?: VariableValidatorBaseParams<T>)
    {
        if (!isDefined(params))
            params = {};

        this._onValidated = new EventHandler<VariableValidatedEvent>();
        this._linkedVariable = null;
        this._isAttached = isDefined(params.attach) ? params.attach : true;
        this._isAlwaysFinishingSyncValidation = isDefined(params.alwaysFinishSyncValidation) ? params.alwaysFinishSyncValidation : true;
        this.validationAction = isDefined(params.validationAction) ? params.validationAction : null;
        this.asyncValidationAction = isDefined(params.asyncValidationAction) ? params.asyncValidationAction : null;
    }

    public dispose(): void
    {
        this._linkedVariable = null;
        this._isAttached = false;
        this._onValidated.dispose();

        if (!isNull(this.validationAction))
            this.validationAction.dispose();

        if (!isNull(this.asyncValidationAction))
            this.asyncValidationAction.dispose();
    }

    public configure(linkedVariable: IVariable<T>): void
    {
        Assert.False(this.isDisposed, 'validator has been disposed');
        Assert.True(isNull(this._linkedVariable), 'validator has already been configured');
        this._linkedVariable = linkedVariable;
    }

    public detach(): void
    {
        Assert.False(this.isDisposed, 'validator has been disposed');
        this._isAttached = false;
    }

    public attach(): void
    {
        Assert.False(this.isDisposed, 'validator has been disposed');
        if (this._isAttached)
            return;

        this._isAttached = true;
        this.validate();
    }

    public validate(): Undefinable<Promise<void>>
    {
        Assert.False(this.isDisposed, 'validator has been disposed');
        Assert.False(isNull(this._linkedVariable), 'validator hasn\'t been configured');

        const params = this.startDetachedValidation();
        return this.beginValidation(params.value, params.args);
    }

    protected beginValidation(value: T, args?: any): Undefinable<Promise<void>>
    {
        const syncResult = isNull(this.validationAction) ? null : this.validationAction.invoke(value);

        if (this.isAsync)
        {
            if (this.isAlwaysFinishingSyncValidation)
                this.finishValidation(syncResult, VariableValidatorFinishMode.SyncBeforeAsync, value, args);

            const params: VariableValidationAsyncActionParams<T> = {
                value: value,
                args: args,
                onEnd: (asyncResult, v, a) =>
                {
                    if (!this.isDisposed)
                    {
                        if (isNull(syncResult))
                            this.finishValidation(asyncResult, VariableValidatorFinishMode.AsyncAfterSync, v, a);
                        else if (isNull(asyncResult))
                            this.finishValidation(syncResult, VariableValidatorFinishMode.AsyncAfterSync, v, a);
                        else
                        {
                            const fullResult = VariableValidationResult.Combine([syncResult, asyncResult]);
                            this.finishValidation(fullResult, VariableValidatorFinishMode.AsyncAfterSync, v, a);
                        }
                    }
                }
            };
            return this.asyncValidationAction!.begin(params);
        }

        this.finishValidation(syncResult, VariableValidatorFinishMode.Sync, value, args);
        return void(0);
    }

    protected abstract startDetachedValidation(): VariableValidationParams<T>;
    protected abstract finishValidation(
        result: Nullable<VariableValidationResult>,
        mode: VariableValidatorFinishMode,
        value: T,
        args?: any):
        void;

    protected publishValidated(e: VariableValidatedEvent): void
    {
        this._onValidated.publish(this, e);
    }
}
