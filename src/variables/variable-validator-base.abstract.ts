import { Nullable } from 'frl-ts-utils/lib/types';
import { isDefined, Assert, isNull } from 'frl-ts-utils/lib/functions';
import { IDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { IEvent, EventHandler } from 'frl-ts-utils/lib/events';
import { SkippableAction } from 'frl-ts-utils/lib/skippable-action';
import { IVariableValidator } from './variable-validator.interface';
import { VariableValidatorState } from './variable-validator-state';
import { VariableValidatedEvent } from './variable-validated-event';
import { IVariable } from './variable.interface';

type VariableValidatorActionParams<T> =
{
    readonly value: T;
    readonly args?: any;
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
        return this._asyncValidator.isInvoking;
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
        return isNull(this.state.warnings) || this.state.warnings.length === 0;
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

    private readonly _onValidated: EventHandler<VariableValidatedEvent>;
    private readonly _asyncValidator: SkippableAction<VariableValidatorActionParams<T>>;

    private _linkedVariable: Nullable<IVariable<T>>;
    private _isAttached: boolean;

    protected constructor(attach?: boolean)
    {
        this._onValidated = new EventHandler<VariableValidatedEvent>();
        this._asyncValidator = new SkippableAction<VariableValidatorActionParams<T>>(async params =>
            {
                const result = await this.checkValidity(params!.value, params!.args);
                if (!this.isDisposed)
                    this.finishValidation(params!.value, result, params!.args);
            });

        this._linkedVariable = null;
        this._isAttached = isDefined(attach) ? attach : true;
    }

    public dispose(): void
    {
        this._linkedVariable = null;
        this._isAttached = false;
        this._onValidated.dispose();
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

    public validate(): Promise<void>
    {
        Assert.False(this.isDisposed, 'validator has been disposed');
        Assert.False(isNull(this._linkedVariable), 'validator hasn\'t been configured');
        return this.validateImpl();
    }

    protected async beginValidation(value: T, args?: any): Promise<void>
    {
        const params: VariableValidatorActionParams<T> = {
            value: value,
            args: args
        };

        await (this.isBusy ?
            this._asyncValidator.invoke(params).then(() => this._asyncValidator.current()!) :
            this._asyncValidator.invoke(params));
    }

    protected abstract validateImpl(): Promise<void>;
    protected abstract checkValidity(value: T, args?: any): Promise<Nullable<VariableValidatorState>>;
    protected abstract finishValidation(value: T, result: Nullable<VariableValidatorState>, args?: any): void;

    protected publishValidated(e: VariableValidatedEvent): void
    {
        this._onValidated.publish(this, e);
    }
}
