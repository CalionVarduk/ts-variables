import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast, isDefined, isNull } from 'frl-ts-utils/lib/functions';
import { IReadonlyUnorderedMap, UnorderedMap, Iteration, MapEntry, makeMapEntry } from 'frl-ts-utils/lib/collections';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableValidatorBase } from '../variable-validator-base.abstract';
import { ObjectVariableValue } from './object-variable-value';
import { IObjectVariableValidator } from './object-variable-validator.interface';
import { ObjectVariableValidatorState } from './object-variable-validator-state.abstract';
import { IReadonlyObjectVariable } from './readonly-object-variable.interface';
import { IVariable } from '../variable.interface';
import { ObjectVariablePropertyValidatorState } from './object-variable-property-validator-state';
import { ObjectVariablePropertyValidatedEvent } from './object-variable-property-validated-event';
import { ObjectVariableValidatedEvent } from './object-variable-validated-event';
import { ObjectVariableValidationAction } from './object-variable-validation-action';
import { VariableValidatorFinishMode } from '../variable-validator-finish-mode.enum';
import { VariableValidationParams } from '../variable-validation-params';
import { ObjectVariableValidationAsyncAction } from './object-variable-validation-async-action';

class MutableObjectVariableValidatorState
    extends
    ObjectVariableValidatorState
{
    public get errors(): Nullable<ReadonlyArray<string>>
    {
        if (this.invalidProperties.length === 0)
            return null;

        return Iteration.ToArray(
            Iteration.MapMany(
                this.invalidProperties.values(),
                p => p.state.errors!.map(e => `${p.name} :: ${e}`)));
    }

    public get warnings(): Nullable<ReadonlyArray<string>>
    {
        if (this.propertiesWithWarnings.length === 0)
            return null;

        return Iteration.ToArray(
            Iteration.MapMany(
                this.propertiesWithWarnings.values(),
                p => p.state.warnings!.map(e => `${p.name} :: ${e}`)));
    }

    public currentValue: ObjectVariableValue;
    public readonly invalidProperties: UnorderedMap<string, ObjectVariablePropertyValidatorState>;
    public readonly propertiesWithWarnings: UnorderedMap<string, ObjectVariablePropertyValidatorState>;

    public constructor(currentValue: ObjectVariableValue)
    {
        super();
        this.currentValue = currentValue;
        this.invalidProperties = new UnorderedMap<string, ObjectVariablePropertyValidatorState>();
        this.propertiesWithWarnings = new UnorderedMap<string, ObjectVariablePropertyValidatorState>();
    }
}

export type ObjectVariableValidatorParams =
{
    readonly attach?: boolean;
    readonly alwaysFinishSyncValidation?: boolean;
};

export class ObjectVariableValidator
    extends
    VariableValidatorBase<ObjectVariableValue>
    implements
    IObjectVariableValidator
{
    public get state(): ObjectVariableValidatorState
    {
        return this._state;
    }

    public get isAsync(): boolean
    {
        return reinterpretCast<ObjectVariableValidationAsyncAction>(this.asyncValidationAction).variables.length > 0;
    }

    public get isValid(): boolean
    {
        return this._state.invalidProperties.length === 0;
    }

    public get hasWarnings(): boolean
    {
        return this._state.propertiesWithWarnings.length > 0;
    }

    protected get linkedVariable(): Nullable<IReadonlyObjectVariable>
    {
        return reinterpretCast<Nullable<IReadonlyObjectVariable>>(super.linkedVariable);
    }

    protected get properties(): Nullable<IReadonlyUnorderedMap<string, IVariable>>
    {
        return this._properties;
    }

    private readonly _propertyListeners: IEventListener[];
    private readonly _state: MutableObjectVariableValidatorState;

    private _properties: Nullable<IReadonlyUnorderedMap<string, IVariable>>;

    public constructor(params?: ObjectVariableValidatorParams)
    {
        if (!isDefined(params))
            params = {};

        super({
            attach: params.attach,
            alwaysFinishSyncValidation: params.alwaysFinishSyncValidation,
            validationAction: new ObjectVariableValidationAction(),
            asyncValidationAction: new ObjectVariableValidationAsyncAction()
        });

        this._propertyListeners = [];
        this._properties = null;
        this._state = new MutableObjectVariableValidatorState(ObjectVariableValue.CreateEmpty());
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        for (const listener of this._propertyListeners)
            listener.dispose();

        this._propertyListeners.splice(0);
        this._state.invalidProperties.clear();
        this._state.propertiesWithWarnings.clear();
        this._state.currentValue = ObjectVariableValue.CreateEmpty();
        this._properties = null;
        super.dispose();
    }

    public configure(linkedVariable: IReadonlyObjectVariable): void
    {
        super.configure(linkedVariable);

        this._properties = linkedVariable.getTrackedProperties();

        const validationAction = reinterpretCast<ObjectVariableValidationAction>(this.validationAction);
        validationAction.configure(this._properties);

        const asyncValidationAction = reinterpretCast<ObjectVariableValidationAsyncAction>(this.asyncValidationAction);
        asyncValidationAction.configure(this._properties);

        this._updateState(linkedVariable.value);

        // TODO: hm, leave optimizations for now
        // not sure about this one, this would trigger double validation for all properties...
        // maybe, onReset should check if variable is busy validating, if so, sub to its event once (ignoring default mechanism)
        // if it's not busy validating, then validate it and wait for response
        // once all variable's have been validated, publish event
        // additional sub + ignore default mechanism feels awkward...
        // maybe a simple flag on the variable itself, that it's resetting, would suffice...?
        // question: do we actually need validator event, that all object's properties have been validated after reset...?
        // same question for change tracker
        // this._resetListener = linkedVariable.onReset.listen((_, e) =>
        //     {
        //         if (!this.isAttached)
        //             return;

        //         this._updateState(e!.currentValue);
        //         this.beginValidation(e!.currentValue, e);
        //     });

        for (const property of this._properties)
        {
            const listener = property.value.validator.onValidated.listen((_, e) =>
                {
                    if (!this.isAttached)
                        return;

                    const wasValid = !this._state.invalidProperties.has(property.key);

                    if (e!.isValid)
                        this._state.invalidProperties.tryDelete(property.key);
                    else
                    {
                        const propertyState = new ObjectVariablePropertyValidatorState(property);
                        this._state.invalidProperties.set(property.key, propertyState);
                    }
                    if (e!.hasWarnings)
                    {
                        const propertyState = new ObjectVariablePropertyValidatorState(property);
                        this._state.propertiesWithWarnings.set(property.key, propertyState);
                    }
                    else
                        this._state.propertiesWithWarnings.tryDelete(property.key);

                    // TODO: these property change events shouldn't be published, when the object itself is being reset
                    // otherwise we will have unnecessary(?) duplicates
                    const event = new ObjectVariablePropertyValidatedEvent(
                        property.key,
                        wasValid !== e!.isValid,
                        this.isValid,
                        this.hasWarnings,
                        this.state,
                        e!);

                    this.publishValidated(event);
                });
            this._propertyListeners.push(listener);
        }
    }

    public getValidProperties(): Iterable<MapEntry<string, IVariable>>
    {
        return Iteration.FilterNotNull(
            Iteration.LeftJoin(
                this._properties!, p => p.key,
                this._state.invalidProperties.keys(), k => k,
                (p, k) => isNull(k) ? makeMapEntry(p.key, p.value) : null));
    }

    public getInvalidProperties(): Iterable<MapEntry<string, IVariable>>
    {
        return Iteration.Map(
            this._state.invalidProperties.keys(),
            k => makeMapEntry(k, this._properties!.get(k)));
    }

    public getPropertiesWithWarnings(): Iterable<MapEntry<string, IVariable>>
    {
        return Iteration.Map(
            this._state.propertiesWithWarnings.keys(),
            k => makeMapEntry(k, this._properties!.get(k)));
    }

    protected startDetachedValidation(): VariableValidationParams<ObjectVariableValue>
    {
        this._updateState(this.linkedVariable!.value);
        const result: VariableValidationParams<ObjectVariableValue> = {
            value: this.linkedVariable!.value,
            args: null
        };
        return result;
    }

    protected finishValidation(_0: null, _1: VariableValidatorFinishMode, value: ObjectVariableValue, args?: any): void
    {
        this._state.currentValue = value;
        const event = new ObjectVariableValidatedEvent(
            this.isValid,
            this.hasWarnings,
            this.state,
            args);

        this.publishValidated(event);
    }

    private _updateState(value: ObjectVariableValue): void
    {
        this._state.currentValue = value;

        // TODO: optimize this maybe...?
        // remove only listeners from removed elements
        // add new listeners to added/replaced elements (for replaced, remove current listener first)
        this._state.invalidProperties.clear();
        this._state.propertiesWithWarnings.clear();

        for (const property of this._properties!)
        {
            if (!property.value.validator.isValid)
            {
                const propertyState = new ObjectVariablePropertyValidatorState(property);
                this._state.invalidProperties.set(property.key, propertyState);
            }
            if (property.value.validator.hasWarnings)
            {
                const propertyState = new ObjectVariablePropertyValidatorState(property);
                this._state.propertiesWithWarnings.set(property.key, propertyState);
            }
        }
    }
}
