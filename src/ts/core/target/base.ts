import consts from '../consts';
import { TargetType } from '../enum';
import { kernel, model, common, schema, faildResult } from '../../base';
import Authority from './authority/authority';
import { IAuthority } from './authority/iauthority';
import { IIdentity } from './authority/iidentity';
import { ITarget } from './itarget';
import Identity from './authority/identity';
export default class BaseTarget implements ITarget {
  public target: schema.XTarget;
  public subTypes: TargetType[];
  public pullTypes: TargetType[];
  public authorityTree: Authority | undefined;
  public ownIdentitys: schema.XIdentity[];
  public identitys: IIdentity[];

  public createTargetType: TargetType[];
  public joinTargetType: TargetType[];
  public searchTargetType: TargetType[];

  constructor(target: schema.XTarget) {
    this.target = target;
    this.subTypes = [];
    this.pullTypes = [];
    this.createTargetType = [];
    this.joinTargetType = [];
    this.searchTargetType = [];
    this.ownIdentitys = [];
    this.identitys = [];
  }
  async createIdentity(
    params: Omit<model.IdentityModel, 'id' | 'belongId'>,
  ): Promise<IIdentity | undefined> {
    const res = await kernel.createIdentity({
      ...params,
      id: '0',
      belongId: this.target.id,
    });
    if (res.success && res.data != undefined) {
      const newItem = new Identity(res.data);
      this.identitys.push(newItem);
      return newItem;
    }
  }
  async deleteIdentity(id: string): Promise<boolean> {
    const index = this.identitys.findIndex((item) => {
      return item.id === id;
    });
    if (index > -1) {
      const res = await kernel.deleteIdentity({
        id: id,
        typeName: this.target.typeName,
        belongId: this.target.id,
      });
      if (res.success) {
        this.identitys = this.identitys.splice(index, 1);
      }
      return res.success;
    }
    return false;
  }
  async getIdentitys(): Promise<IIdentity[]> {
    if (this.identitys.length > 0) {
      return this.identitys;
    }
    const res = await kernel.queryTargetIdentitys({
      id: this.target.id,
      page: {
        offset: 0,
        filter: '',
        limit: common.Constants.MAX_UINT_16,
      },
    });
    if (res.success && res.data && res.data.result) {
      this.identitys = res.data.result.map((item) => {
        return new Identity(item);
      });
    }
    return this.identitys;
  }

  protected async createSubTarget(
    data: Omit<model.TargetModel, 'id'>,
  ): Promise<model.ResultType<schema.XTarget>> {
    if (this.subTypes.includes(<TargetType>data.typeName)) {
      const res = await this.createTarget(data);
      if (res.success) {
        await kernel.pullAnyToTeam({
          id: this.target.id,
          teamTypes: [this.target.typeName],
          targetIds: [res.data?.id],
          targetType: <TargetType>data.typeName,
        });
      }
      return res;
    }
    return faildResult(consts.UnauthorizedError);
  }

  protected async deleteSubTarget(
    id: string,
    typeName: string,
    spaceId: string,
  ): Promise<model.ResultType<any>> {
    return await kernel.deleteTarget({
      id: id,
      typeName: typeName,
      belongId: spaceId,
    });
  }

  public async pullMember(
    targets: schema.XTarget[],
  ): Promise<model.ResultType<schema.XRelationArray>> {
    targets = targets.filter((a) => {
      return this.pullTypes.includes(<TargetType>a.typeName);
    });
    if (targets.length > 0) {
      const res = await kernel.pullAnyToTeam({
        id: this.target.id,
        teamTypes: [this.target.typeName],
        targetIds: targets.map((a) => {
          return a.id;
        }),
        targetType: <TargetType>targets[0].typeName,
      });
      return res;
    }
    return faildResult(consts.UnauthorizedError);
  }

  protected async removeMember(
    ids: string[],
    typeName: TargetType,
  ): Promise<model.ResultType<any>> {
    if (this.pullTypes.includes(typeName)) {
      return await kernel.removeAnyOfTeam({
        id: this.target.id,
        teamTypes: [this.target.typeName],
        targetIds: ids,
        targetType: typeName,
      });
    }
    return faildResult(consts.UnauthorizedError);
  }

  /**
   * 根据编号查询组织/个人
   * @param code 编号
   * @param TypeName 类型
   * @returns
   */
  public async searchTargetByName(
    code: string,
    typeNames: TargetType[],
  ): Promise<model.ResultType<schema.XTargetArray>> {
    typeNames = this.searchTargetType.filter((a) => {
      return typeNames.includes(a);
    });
    if (typeNames.length > 0) {
      return await kernel.searchTargetByName({
        name: code,
        typeNames: typeNames,
        page: {
          offset: 0,
          filter: code,
          limit: common.Constants.MAX_UINT_16,
        },
      });
    }
    return faildResult(consts.UnauthorizedError);
  }

  /**
   * 申请加入组织/个人 (好友申请除外)
   * @param destId 加入的组织/个人id
   * @param typeName 对象
   * @returns
   */
  public async applyJoin(
    destId: string,
    typeName: TargetType,
  ): Promise<model.ResultType<any>> {
    if (this.joinTargetType.includes(typeName)) {
      return await kernel.applyJoinTeam({
        id: destId,
        targetId: this.target.id,
        teamType: typeName,
        targetType: this.target.typeName,
      });
    }
    return faildResult(consts.UnauthorizedError);
  }

  /**
   * 取消加入组织/个人
   * @param id 申请Id/目标Id
   * @returns
   */
  protected async cancelJoinTeam(id: string): Promise<model.ResultType<any>> {
    return await kernel.cancelJoinTeam({
      id,
      belongId: this.target.id,
      typeName: this.target.typeName,
    });
  }

  /**
   * 审批我的加入组织/个人申请
   * @param id
   * @param status
   * @returns
   */
  protected async approvalJoinApply(
    id: string,
    status: number,
  ): Promise<model.ResultType<any>> {
    return await kernel.joinTeamApproval({
      id,
      status,
    });
  }
  protected async getjoinedTargets(
    typeNames: TargetType[],
    spaceId: string = '0',
  ): Promise<model.ResultType<schema.XTargetArray>> {
    typeNames = typeNames.filter((a) => {
      return this.joinTargetType.includes(a);
    });
    if (typeNames.length > 0) {
      return await kernel.queryJoinedTargetById({
        id: this.target.id,
        typeName: this.target.typeName,
        page: {
          offset: 0,
          filter: '',
          limit: common.Constants.MAX_UINT_16,
        },
        spaceId: spaceId,
        JoinTypeNames: typeNames,
      });
    }
    return faildResult(consts.UnauthorizedError);
  }

  /**
   * 获取子组织/个人
   * @returns 返回好友列表
   */
  protected async getSubTargets(
    typeNames: TargetType[],
  ): Promise<model.ResultType<schema.XTargetArray>> {
    return await kernel.querySubTargetById({
      id: this.target.id,
      typeNames: [this.target.typeName],
      subTypeNames: typeNames,
      page: {
        offset: 0,
        filter: '',
        limit: common.Constants.MAX_UINT_16,
      },
    });
  }

  /**
   * 拉自身进组织(创建组织的时候调用)
   * @param target 目标对象
   * @returns
   */
  protected async join(target: schema.XTarget): Promise<model.ResultType<any>> {
    if (this.joinTargetType.includes(<TargetType>target.typeName)) {
      return await kernel.pullAnyToTeam({
        id: this.target.id,
        teamTypes: [target.typeName],
        targetType: this.target.typeName,
        targetIds: [this.target.id],
      });
    }
    return faildResult(consts.UnauthorizedError);
  }

  /**
   * 创建对象
   * @param name 名称
   * @param code 编号
   * @param typeName 类型
   * @param teamName team名称
   * @param teamCode team编号
   * @param teamRemark team备注
   * @returns
   */
  protected async createTarget(
    data: Omit<model.TargetModel, 'id'>,
  ): Promise<model.ResultType<schema.XTarget>> {
    if (this.createTargetType.includes(<TargetType>data.typeName)) {
      return await kernel.createTarget({
        ...data,
        id: '0',
      });
    } else {
      return faildResult(consts.UnauthorizedError);
    }
  }

  /**
   * 更新组织、对象
   * @param name 名称
   * @param code 编号
   * @param typeName 类型
   * @param teamName team名称
   * @param teamCode team编号
   * @param teamRemark team备注
   * @returns
   */
  protected async updateTarget(
    data: Omit<model.TargetModel, 'id'>,
  ): Promise<model.ResultType<schema.XTarget>> {
    data.teamCode = data.teamCode == '' ? data.code : data.teamCode;
    data.teamName = data.teamName == '' ? data.name : data.teamName;
    let res = await kernel.updateTarget({
      ...data,
      id: this.target.id,
      typeName: this.target.typeName,
    });
    if (res.success) {
      this.target.name = data.name;
      this.target.code = data.code;
      this.target.belongId = data.belongId;
      if (this.target.team != undefined) {
        this.target.team.name = data.teamName;
        this.target.team.code = data.teamCode;
        this.target.team.remark = data.teamRemark;
      }
    }
    return res;
  }

  /**
   * 判断是否拥有该身份
   * @param id 身份id
   */
  async judgeHasIdentity(id: string): Promise<boolean> {
    if (this.ownIdentitys.length == 0) {
      await this.getOwnIdentitys(true);
    }
    return this.ownIdentitys.find((a) => a.id == id) != undefined;
  }

  private async getOwnIdentitys(reload: boolean = false) {
    if (!reload && this.ownIdentitys.length > 0) {
      return this.ownIdentitys;
    }
    const res = await kernel.querySpaceIdentitys({ id: this.target.id });
    if (res.success && res.data.result) {
      this.ownIdentitys = res.data.result;
    }
    return this.ownIdentitys;
  }

  /**
   * 查询组织职权树
   * @param id
   * @returns
   */
  public async selectAuthorityTree(
    reload: boolean = false,
  ): Promise<IAuthority | undefined> {
    if (!reload && this.authorityTree != undefined) {
      return this.authorityTree;
    }
    await this.getOwnIdentitys(reload);
    const res = await kernel.queryAuthorityTree({
      id: this.target.id,
      page: {
        offset: 0,
        filter: '',
        limit: common.Constants.MAX_UINT_16,
      },
    });
    if (res.success) {
      this.authorityTree = this.loopBuildAuthority(res.data);
    }
    return this.authorityTree;
  }

  protected loopBuildAuthority(auth: schema.XAuthority): Authority {
    const authority = new Authority(auth, this.target.id);
    auth.nodes?.forEach((a) => {
      authority.children.push(this.loopBuildAuthority(a));
    });
    return authority;
  }
}
