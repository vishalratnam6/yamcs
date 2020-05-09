import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Cop1Config, Cop1Status, Cop1Subscription, Link, LinkSubscription } from '../client';
import { AuthService } from '../core/services/AuthService';
import { YamcsService } from '../core/services/YamcsService';

@Component({
  templateUrl: './LinkPage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkPage implements OnDestroy {

  link$ = new BehaviorSubject<Link | null>(null);
  cop1Config$ = new BehaviorSubject<Cop1Config | null>(null);
  cop1Status$ = new BehaviorSubject<Cop1Status | null>(null);

  private linkSubscription: LinkSubscription;
  private cop1Subscription: Cop1Subscription;

  constructor(
    private title: Title,
    route: ActivatedRoute,
    readonly yamcs: YamcsService,
    private authService: AuthService,
  ) {
    route.paramMap.subscribe(params => {
      const linkName = params.get('link')!;
      this.changeLink(linkName);
    });

    this.linkSubscription = this.yamcs.yamcsClient.createLinkSubscription({
      instance: this.yamcs.instance!,
    }, evt => {
      const link = this.link$.value;
      if (link && link.name === evt.linkInfo.name) {
        this.link$.next(evt.linkInfo);
      }
    });
  }

  private changeLink(name: string) {
    if (this.cop1Subscription) {
      this.cop1Subscription.cancel();
    }

    this.cop1Status$.next(null);
    this.cop1Config$.next(null);

    this.yamcs.yamcsClient.getLink(this.yamcs.instance!, name).then(link => {
      this.link$.next(link);
      this.title.setTitle(name);
      if (link.type.indexOf('Cop1Tc') !== -1) {
        this.yamcs.yamcsClient.getCop1Config(this.yamcs.instance!, name).then(cop1Config => {
          this.cop1Config$.next(cop1Config);
        });

        this.cop1Subscription = this.yamcs.yamcsClient.createCop1Subscription({
          instance: link.instance,
          link: name,
        }, status => {
          this.cop1Status$.next(status);
        });
      }
    });
  }

  mayControlLinks() {
    return this.authService.getUser()!.hasSystemPrivilege('ControlLinks');
  }

  enableLink(name: string) {
    this.yamcs.yamcsClient.enableLink(this.yamcs.instance!, name);
  }

  disableLink(name: string) {
    this.yamcs.yamcsClient.disableLink(this.yamcs.instance!, name);
  }

  resetCounters(name: string) {
    this.yamcs.yamcsClient.editLink(this.yamcs.instance!, name, {
      resetCounters: true,
    });
  }

  ngOnDestroy() {
    if (this.linkSubscription) {
      this.linkSubscription.cancel();
    }
    if (this.cop1Subscription) {
      this.cop1Subscription.cancel();
    }
  }
}
