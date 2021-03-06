import {TuyaDevice, TuyaDeviceState} from '../../TuyaWebApi';
import {
  Characteristic,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  Formats,
} from 'homebridge';
import {TuyaWebCharacteristic} from './base';
import {BaseAccessory} from '../BaseAccessory';

export type RotationSpeedCharacteristicData = { speed_level: number, speed: string }
type DeviceWithRotationSpeedCharacteristic = TuyaDevice<TuyaDeviceState & RotationSpeedCharacteristicData>

export class RotationSpeedCharacteristic extends TuyaWebCharacteristic {
    public static Title = 'Characteristic.RotationSpeed'

    public static HomekitCharacteristic(accessory: BaseAccessory) {
      return accessory.platform.Characteristic.RotationSpeed;
    }

    public setProps(char?: Characteristic): Characteristic | undefined {
      return char?.setProps({
        unit: undefined,
        format: Formats.INT,
        minValue: 0,
        maxValue: this.maxSpeedLevel,
        minStep: 1,
      });
    }

    public static isSupportedByAccessory(accessory): boolean {
      return accessory.deviceConfig.data.speed_level !== undefined &&
            accessory.deviceConfig.data.speed !== undefined;
    }

    public get maxSpeedLevel(): number {
      const data = this.accessory.deviceConfig.data as unknown as RotationSpeedCharacteristicData;
      return data.speed_level;
    }

    public getRemoteValue(callback: CharacteristicGetCallback): void {
      // Retrieve state from cache
      const cachedState = this.accessory.getCachedState(this.homekitCharacteristic);
      if (cachedState) {
        callback(null, cachedState);
      } else {
        // Retrieve device state from Tuya Web API
        this.accessory.platform.tuyaWebApi.getDeviceState<RotationSpeedCharacteristicData>(this.accessory.deviceId).then((data) => {
          this.debug('[GET] %s', data?.speed);
          this.updateValue(data, callback);
        }).catch((error) => {
          this.error('[GET] %s', error.message);
          this.accessory.invalidateCache();
          callback(error);
        });
      }
    }

    public setRemoteValue(homekitValue: CharacteristicValue, callback: CharacteristicSetCallback): void {
      // Set device state in Tuya Web API
      let value = Number(homekitValue);
      // Set value to 1 if value is too small
      value = value < 1 ? 1 : value;
      // Set value to minSpeedLevel if value is too large
      value = value > this.maxSpeedLevel ? this.maxSpeedLevel : value;

      this.accessory.platform.tuyaWebApi.setDeviceState(this.accessory.deviceId, 'windSpeedSet', {value}).then(() => {
        this.debug('[SET] %s %s', homekitValue, value);
        this.accessory.setCachedState(this.homekitCharacteristic, homekitValue);
        callback();
      }).catch((error) => {
        this.error('[SET] %s', error.message);
        this.accessory.invalidateCache();
        callback(error);
      });
    }

    updateValue(data: DeviceWithRotationSpeedCharacteristic['data'] | undefined, callback?: CharacteristicGetCallback): void {
      if (data?.speed !== undefined) {
        const speed = Number(data.speed);
        this.accessory.setCharacteristic(this.homekitCharacteristic, speed, !callback);
        callback && callback(null, speed);
      }
    }
}
