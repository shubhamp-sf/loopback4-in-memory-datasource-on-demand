// Uncomment these imports to begin using these cool features!

import {CoreBindings, inject} from '@loopback/core';
import {
  AnyObject,
  Filter,
  defineCrudRepositoryClass,
  juggler,
} from '@loopback/repository';
import {get, param, response} from '@loopback/rest';
import csv from 'csvtojson';
import path from 'path';
import {OnDemandMemoryDatasourceApplication} from '../application';
import {AuditLog} from '../models';
export class CsvController {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: OnDemandMemoryDatasourceApplication,
  ) {}
  @get('/csv')
  @response(200)
  async find(@param.filter(AuditLog) filter?: Filter<AuditLog>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await (csv as any)().fromFile(
      path.resolve(__dirname, '..', '..', 'public', 'myfile.csv'),
    )) as Promise<AnyObject>;

    // define datasource
    const dsName = 'csvds';
    const csvDataSource = new juggler.DataSource({
      name: dsName,
      connector: 'memory',
    });
    await csvDataSource.connect();
    this.application.dataSource(csvDataSource, dsName);

    // configure repository
    const CSVRepo = defineCrudRepositoryClass<
      AuditLog,
      typeof AuditLog.prototype.id,
      {}
    >(AuditLog);
    inject(`datasources.${csvDataSource.name}`)(CSVRepo, undefined, 0);
    this.application.repository(CSVRepo);

    const csvRepoInstance = await this.application.getRepository(CSVRepo);

    // Fill in the json returned from the csv
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await csvRepoInstance.createAll(json as any);
    const allRecords = await csvRepoInstance.find(filter);

    // clear up the memory
    await csvRepoInstance.deleteAll();

    return allRecords;
  }
}
